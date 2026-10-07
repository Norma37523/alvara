import Link from "next/link";
import { Badge } from "@/components/badge";
import { DetailDrawer } from "@/components/detail-drawer";
import {
  cut,
  displayName,
  formatDate,
  plural,
  statusLabel,
  summarize,
  TYPE_SHORT,
} from "@/domain/license";
import { hrefWith, loadViewContext } from "@/server/view-context";

export const metadata = { title: "Dashboard – Norma Alvarás" };

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const ctx = await loadViewContext(await searchParams);
  const { scoped: items, params } = ctx;
  const s = summarize(items);

  const upcoming = items
    .filter((i) => i.days !== null && i.days <= 90)
    .sort((a, b) => (a.days as number) - (b.days as number));
  const demands = items
    .filter(
      (i) =>
        i.flag ||
        /aguardando|verificando/i.test(i.documentaryStatus ?? "") ||
        i.status === "expired",
    )
    .sort((a, b) => a.score - b.score);

  const title = ctx.companies.find((c) => c.id === params.empresa)?.name ?? "Carteira de clientes";
  const alerts = s.expired + s.due30;
  const regular = s.valid + s.noTerm;
  const alertParts = [
    s.expired ? plural(s.expired, "documento vencido", "documentos vencidos") : null,
    s.due30 ? `${plural(s.due30, "vence", "vencem")} em até 30 dias` : null,
  ].filter(Boolean);

  const open = (id: string) => hrefWith("/", params, { doc: id });

  return (
    <>
      <h1 className="title">{title}</h1>
      <p className="sub">
        Resumo dos documentos e demandas{params.unidade ? ` · ${params.unidade}` : ""}
      </p>

      {alerts > 0 ? (
        <div className="alert bad">
          <div>
            <strong>{alertParts.join(" e ")}</strong>
            <span>Regularize para evitar multas e restrições de funcionamento.</span>
          </div>
          <Link className="btn" href={hrefWith("/documentos", params, { f: "acao", doc: null })}>
            Ver documentos
          </Link>
        </div>
      ) : (
        <div className="alert good">
          <div>
            <strong>Nenhum documento vencido ou vencendo em 30 dias.</strong>
            <span>Continue acompanhando as pendências abaixo.</span>
          </div>
        </div>
      )}

      <div className="tiles">
        <div className="tile">
          <div className="l">Documentos em dia</div>
          <div className="v">{s.valid}</div>
          <div className="n">
            {Math.round((regular / Math.max(s.total, 1)) * 100)}% regulares (em dia ou sem prazo)
          </div>
        </div>
        <div className="tile warn">
          <div className="l">Vencendo em 60 dias</div>
          <div className="v">{s.due30 + s.due60}</div>
          <div className="n">{s.due30 ? `${s.due30} em até 30 dias` : "nenhum em até 30 dias"}</div>
        </div>
        <div className="tile bad">
          <div className="l">Documentos vencidos</div>
          <div className="v">{s.expired}</div>
          <div className="n">{s.expired ? "ação urgente necessária" : "nenhum vencido"}</div>
        </div>
        <div className="tile mute">
          <div className="l">Sem data de validade</div>
          <div className="v">{s.pending + s.noTerm}</div>
          <div className="n">
            {s.pending} pendentes · {s.noTerm} sem prazo definido
          </div>
        </div>
      </div>

      <div className="cols">
        <div className="card">
          <h2>
            Próximas renovações
            <Link
              href={hrefWith("/renovacoes", params, { doc: null })}
              style={{ fontSize: 13, color: "var(--accent)" }}
            >
              Ver todas
            </Link>
          </h2>
          <p className="hint">Vencidos e vencimentos nos próximos 90 dias</p>
          {upcoming.length ? (
            <ul className="list">
              {upcoming.slice(0, 6).map((i) => (
                <li key={i.id}>
                  <Link className="go" href={open(i.id)} scroll={false}>
                    <div className="t">{TYPE_SHORT[i.type]}</div>
                    <div className="s">
                      {displayName(i)} · {formatDate(i.validUntil)}
                    </div>
                  </Link>
                  <Badge item={i} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">Nenhuma renovação nos próximos 90 dias.</div>
          )}
        </div>

        <div className="card">
          <h2>
            Demandas e pendências
            <Link
              href={hrefWith("/documentos", params, { doc: null })}
              style={{ fontSize: 13, color: "var(--accent)" }}
            >
              Ver todas
            </Link>
          </h2>
          <p className="hint">
            {plural(demands.length, "item em acompanhamento", "itens em acompanhamento")}
          </p>
          {demands.length ? (
            <ul className="list">
              {demands.slice(0, 6).map((i) => (
                <li key={i.id}>
                  <Link className="go" href={open(i.id)} scroll={false}>
                    <div className="t">
                      {TYPE_SHORT[i.type]} · {displayName(i)}
                    </div>
                    <div className="s">{cut(i.notes ?? "", 120) || statusLabel(i)}</div>
                  </Link>
                  <Badge item={i} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">Nenhuma pendência.</div>
          )}
        </div>
      </div>

      {ctx.openDoc && <DetailDrawer item={ctx.openDoc} />}
    </>
  );
}
