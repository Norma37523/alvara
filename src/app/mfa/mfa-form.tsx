"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const codeSchema = z.string().regex(/^\d{6}$/);

type Mode =
  | { kind: "loading" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "challenge"; factorId: string }
  | { kind: "failed" };

export function MfaForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const auth = createBrowserSupabase().auth;
      const { data: list, error: listError } = await auth.mfa.listFactors();
      if (cancelled) return;
      if (listError) return setMode({ kind: "failed" });

      const verified = list.totp.find((f) => f.status === "verified");
      if (verified) return setMode({ kind: "challenge", factorId: verified.id });

      // Descarta cadastros iniciados e não concluídos antes de gerar um novo QR code.
      for (const f of list.all.filter((x) => x.status === "unverified")) {
        await auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: enrollError } = await auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Norma Alvarás",
      });
      if (cancelled) return;
      if (enrollError || !data) return setMode({ kind: "failed" });
      setMode({
        kind: "enroll",
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode.kind !== "enroll" && mode.kind !== "challenge") return;
    const code = codeSchema.safeParse(new FormData(e.currentTarget).get("code"));
    if (!code.success) {
      setError("Digite os 6 números do aplicativo.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: verifyError } = await createBrowserSupabase().auth.mfa.challengeAndVerify({
      factorId: mode.factorId,
      code: code.data,
    });
    if (verifyError) {
      setError("Código inválido ou expirado. Tente o código atual do aplicativo.");
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  if (mode.kind === "loading") return <p className="sub">Carregando…</p>;
  if (mode.kind === "failed") {
    return (
      <p className="err" role="alert">
        Não foi possível iniciar a verificação. Saia e entre de novo.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {mode.kind === "enroll" ? (
        <>
          <p className="sub" style={{ marginBottom: 0 }}>
            Primeiro acesso: abra um aplicativo autenticador (Google Authenticator, Microsoft
            Authenticator ou similar) e leia o QR code.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="qr" src={mode.qr} alt="QR code para o aplicativo autenticador" />
          <p className="sub" style={{ margin: "0 0 4px" }}>
            Ou digite esta chave no aplicativo:
          </p>
          <div className="secret">{mode.secret}</div>
        </>
      ) : (
        <p className="sub">Digite o código de 6 números do seu aplicativo autenticador.</p>
      )}
      <div className="field">
        <label htmlFor="code">Código de 6 números</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
        />
      </div>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <button
        className="btn accent"
        type="submit"
        disabled={busy}
        style={{ marginTop: 18, width: "100%" }}
      >
        {busy ? "Verificando…" : mode.kind === "enroll" ? "Ativar e entrar" : "Entrar"}
      </button>
    </form>
  );
}
