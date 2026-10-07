"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/badge";
import { displayName, formatDate, TYPE_LABEL, type LicenseItem } from "@/domain/license";

export function DetailDrawer({ item }: { item: LicenseItem }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const closeRef = useRef<HTMLButtonElement>(null);

  function close() {
    const qs = new URLSearchParams(search.toString());
    qs.delete("doc");
    const s = qs.toString();
    router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows: [string, string | null][] = [
    ["Empresa", displayName(item)],
    ["CNPJ", item.unitCnpj],
    ["Município", item.municipality],
    ["Órgão emissor", item.issuingBody],
    ["Nº do documento", item.number],
    ["Data de emissão", item.issuedOn ? formatDate(item.issuedOn) : null],
    ["Data de validade", item.validUntil ? formatDate(item.validUntil) : "não informada"],
    ["Situação registrada", item.documentaryStatus],
    ["Responsável interno", item.ownerName],
  ];

  return (
    <>
      <div className="scrim on" onClick={close} aria-hidden="true" />
      <aside className="drawer on" role="dialog" aria-modal="true" aria-labelledby="dTitle">
        <button ref={closeRef} className="close" type="button" onClick={close} aria-label="Fechar">
          ×
        </button>
        <Badge item={item} />
        <h2 id="dTitle">{TYPE_LABEL[item.type]}</h2>
        <div style={{ color: "var(--muted)" }}>{displayName(item)}</div>
        <dl>
          {rows
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        {item.notes && (
          <div className="obs">
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
              Observações internas
            </div>
            {item.notes}
          </div>
        )}
      </aside>
    </>
  );
}
