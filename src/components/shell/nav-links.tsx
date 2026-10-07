"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/documentos", label: "Documentos", icon: "documentos" },
  { href: "/renovacoes", label: "Renovações", icon: "renovacoes" },
  { href: "/notificacoes", label: "Notificações", icon: "notificacoes" },
];

export function NavLinks({ alertCount, isAdmin }: { alertCount: number; isAdmin: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams();

  // Mantém empresa e unidade ao trocar de tela.
  const keep = new URLSearchParams();
  for (const key of ["empresa", "unidade"]) {
    const v = search.get(key);
    if (v) keep.set(key, v);
  }
  const qs = keep.toString();
  const href = (path: string) => (qs ? `${path}?${qs}` : path);

  return (
    <nav className="nav" aria-label="Seções">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={href(item.href)}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
          {item.href === "/notificacoes" && alertCount > 0 && (
            <span className="cnt">{alertCount}</span>
          )}
        </Link>
      ))}
      {isAdmin && (
        <>
          <div className="sep">Somente equipe Norma</div>
          <Link
            href="/administracao"
            aria-current={pathname === "/administracao" ? "page" : undefined}
          >
            <Icon name="administracao" />
            <span>Administração</span>
          </Link>
        </>
      )}
    </nav>
  );
}
