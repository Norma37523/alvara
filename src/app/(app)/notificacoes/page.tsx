import Link from "next/link";
import { DetailDrawer } from "@/components/detail-drawer";
import {
  cut,
  displayName,
  formatDate,
  plural,
  TYPE_SHORT,
  type LicenseItem,
} from "@/domain/license";
import { DEFAULT_MILESTONES } from "@/domain/alerts";
import { hrefWith, loadViewContext } from "@/server/view-context";

export const metadata = { title: "Notificações – Norma Alvarás" };

type Level = "bad" | "warn" | "info";
interface Notice {
  level: Level;
  order: number;
  title: string;
  text: string;
  item: LicenseItem;
}

function buildNotices(items: LicenseItem[]): Notice[] {
  const out: Notice[] = [];
  for (const i of items) {
    const what = `${TYPE_SHORT[i.type]} de ${displayName(i)}`;
    const days = i.days;
    if (i.status === "expired" && days !== null) {
      out.push({
        level: "bad",
        order: days / 1e4,
        title: "Documento vencido",
        text: `${what} venceu há ${Math.abs(days)} dias (${formatDate(i.validUntil)}).`,
        item: i,
      });
    } else if (days !== null && days <= 30) {
      out.push({
        level: "warn",
        order: 1 + days / 1e4,
        title: `Vence em ${days} ${days === 1 ? "dia" : "dias"}`,
        text: `${what} vence em ${formatDate(i.validUntil)}.`,
        item: i,
      });
    } else if (days !== null && days <= 90) {
      out.push({
        level: "info",
        order: 3 + days / 1e4,
        title: `Renovação em ${days} dias`,
        text: `${what} vence em ${formatDate(i.validUntil)}.`,
        item: i,
      });
    }
    if (i.flag) {
      out.push({
        level: "warn",
        order: 2,
        title:
          i.flag === "reissue"
            ? "Reemissão necessária"
            : i.flag === "urgent"
              ? "Pendência urgente"
              : "Pendência de regularização",
        text: `${displayName(i)}: ${cut(i.notes ?? "", 150)}`,
        item: i,
      });
    } else if (i.status === "pending") {
      out.push({
        level: "info",
        order: 4,
        title: "Sem data de validade",
        text: `${what} sem data cadastrada.`,
        item: i,
      });
    }
  }
  return out.sort((a, b) => a.order - b.order);
}

const ICON: Record<Level, string> = { bad: "!", warn: "!", info: "i" };

export default async function NotificacoesPage({ searchParams }: PageProps<"/notificacoes">) {
  const ctx = await loadViewContext(await searchParams);
  const notices = buildNotices(ctx.scoped);

  return (
    <>
      <h1 className="title">Notificações</h1>
      <p className="sub">O que o sistema avisaria hoje</p>
      <div className="cols" style={{ gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1fr)" }}>
        <div className="card">
          <h2>Avisos de hoje</h2>
          <p className="hint">{plural(notices.length, "aviso", "avisos")}</p>
          {notices.length ? (
            <ul className="list feed">
              {notices.slice(0, 30).map((n, idx) => (
                <li key={`${n.item.id}-${idx}`}>
                  <span className={`ico ${n.level}`}>{ICON[n.level]}</span>
                  <Link
                    className="go"
                    href={hrefWith("/notificacoes", ctx.params, { doc: n.item.id })}
                    scroll={false}
                  >
                    <div className="t">{n.title}</div>
                    <div className="s">{n.text}</div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">Nenhum aviso.</div>
          )}
        </div>
        <div className="card">
          <h2>Regras de aviso</h2>
          <p className="hint">Disparos automáticos antes do vencimento (dias)</p>
          <div className="marcos">
            {DEFAULT_MILESTONES.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <dl className="kv">
            <dt>Vencidos</dt>
            <dd>repete a cada 7 dias</dd>
            <dt>E-mail</dt>
            <dd>em implantação</dd>
            <dt>WhatsApp</dt>
            <dd>planejado</dd>
            <dt>Resumo semanal</dt>
            <dd>segunda-feira, 8h</dd>
          </dl>
        </div>
      </div>
      {ctx.openDoc && <DetailDrawer item={ctx.openDoc} />}
    </>
  );
}
