import Link from "next/link";
import { Badge } from "@/components/badge";
import { DetailDrawer } from "@/components/detail-drawer";
import { matchesFilter, TYPE_SHORT, formatDate, type DocFilter } from "@/domain/license";
import { applyDocumentFilters, hrefWith, loadViewContext } from "@/server/view-context";

export const metadata = { title: "Documentos – Norma Alvarás" };

const FILTERS: [DocFilter, string][] = [
  ["todos", "Todos"],
  ["acao", "Exigem ação"],
  ["venc", "Vencidos"],
  ["ok", "Em dia"],
  ["pend", "Pendentes"],
];

export default async function DocumentosPage({ searchParams }: PageProps<"/documentos">) {
  const ctx = await loadViewContext(await searchParams);
  const { params, scoped } = ctx;
  const rows = applyDocumentFilters(ctx);

  return (
    <>
      <h1 className="title">Documentos</h1>
      <p className="sub">Alvarás e licenças organizados e sempre atualizados</p>

      <form className="toolbar" action="/documentos" method="get">
        {params.empresa && <input type="hidden" name="empresa" value={params.empresa} />}
        {params.unidade && <input type="hidden" name="unidade" value={params.unidade} />}
        {params.f && <input type="hidden" name="f" value={params.f} />}
        <input
          className="search"
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por empresa, número ou órgão"
          aria-label="Buscar documentos"
        />
        <select
          className="sel"
          name="tipo"
          defaultValue={params.tipo ?? ""}
          aria-label="Tipo de licença"
        >
          <option value="">Todos os tipos</option>
          <option value="lf">Alvará de funcionamento</option>
          <option value="bombeiros">Alvará de Bombeiros</option>
        </select>
        <button className="btn sec" type="submit">
          Buscar
        </button>
      </form>

      <div className="chips" role="group" aria-label="Filtrar por situação">
        {FILTERS.map(([key, label]) => (
          <Link
            key={key}
            className="chip"
            aria-pressed={ctx.docFilter === key}
            href={hrefWith("/documentos", params, { f: key === "todos" ? null : key, doc: null })}
          >
            {label} ({scoped.filter((i) => matchesFilter(i, key)).length})
          </Link>
        ))}
      </div>

      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Documento</th>
              <th>Nº / protocolo</th>
              <th>Órgão</th>
              <th>Validade</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((i) => (
                <tr key={i.id}>
                  <td>
                    <div className="emp">{i.companyName}</div>
                    <div className="uni">{i.unitLabel}</div>
                  </td>
                  <td>{TYPE_SHORT[i.type]}</td>
                  <td>{i.number ?? "—"}</td>
                  <td>{i.issuingBody ?? "—"}</td>
                  <td>{formatDate(i.validUntil)}</td>
                  <td>
                    <Badge item={i} />
                  </td>
                  <td>
                    <div className="act">
                      <Link
                        href={hrefWith("/documentos", params, { doc: i.id })}
                        scroll={false}
                        className="rowlink"
                      >
                        <button type="button" tabIndex={-1}>
                          Ver
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="empty">
                  Nenhum documento neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {ctx.openDoc && <DetailDrawer item={ctx.openDoc} />}
    </>
  );
}
