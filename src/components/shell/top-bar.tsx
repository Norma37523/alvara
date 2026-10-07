"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import type { CompanyOption } from "@/server/view-context";

function readStoredTheme(): string | null {
  try {
    return localStorage.getItem("norma-theme");
  } catch {
    return null;
  }
}

export function TopBar({
  companies,
  userName,
  roleLabel,
}: {
  companies: CompanyOption[];
  userName: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const empresa = search.get("empresa") ?? "";
  const unidade = search.get("unidade") ?? "";
  const units = companies.find((c) => c.id === empresa)?.units ?? [];

  function update(next: { empresa?: string; unidade?: string }) {
    const qs = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) qs.set(k, v);
      else qs.delete(k);
    }
    qs.delete("doc");
    const s = qs.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  }

  function toggleTheme() {
    const root = document.documentElement;
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const current =
      root.getAttribute("data-theme") ?? readStoredTheme() ?? (dark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("norma-theme", next);
    } catch {
      // Sem armazenamento local: o tema vale só até recarregar.
    }
  }

  return (
    <div className="bar">
      <div className="filters">
        <select
          className="sel"
          aria-label="Empresa"
          value={empresa}
          onChange={(e) => update({ empresa: e.target.value, unidade: "" })}
        >
          <option value="">Todas as empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {empresa && units.length > 1 && (
          <select
            className="sel"
            aria-label="Unidade"
            value={unidade}
            onChange={(e) => update({ unidade: e.target.value })}
          >
            <option value="">Todas as unidades</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="tools">
        <button
          type="button"
          className="iconbtn"
          onClick={toggleTheme}
          aria-label="Alternar tema claro e escuro"
          title="Alternar tema"
        >
          <Icon name="moon" />
        </button>
        <div className="user">
          <b>{userName}</b>
          {roleLabel}
        </div>
      </div>
    </div>
  );
}
