import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar – Norma Alvarás" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;
  const semAcesso = erro === "sem-acesso";
  return (
    <main className="login">
      <div className="card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/horizontal-color.png" alt="Norma Contábil" />
        <h1>Gestão de alvarás e licenças</h1>
        <p className="sub" style={{ margin: 0 }}>
          Acesso restrito à equipe da Norma Contábil.
        </p>
        {semAcesso && (
          <p className="err" role="alert">
            Esta conta não tem acesso ao sistema. Fale com o administrador.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
