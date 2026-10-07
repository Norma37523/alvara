"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      setError("Informe e-mail e senha.");
      return;
    }
    setBusy(true);
    const { error: authError } = await createBrowserSupabase().auth.signInWithPassword(parsed.data);
    if (authError) {
      // Mensagem única, para não revelar se o e-mail existe.
      setError("E-mail ou senha incorretos.");
      setBusy(false);
      return;
    }
    router.replace("/mfa");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {busy ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
