import Link from "next/link";
import { Badge } from "@/components/badge";
import { DetailDrawer } from "@/components/detail-drawer";
import {
  BADGE_CLASS,
  displayName,
  formatDate,
  renewalBuckets,
  TYPE_SHORT,
  type LicenseItem,
} from "@/domain/license";
import { hrefWith, loadViewContext, type ViewParams } from "@/server/view-context";

export const metadata = { title: "Renovações – Norma Alvarás" };

function BucketCard({
  title,
  tone,
  items,
  params,
  undated = false,
}: {
  title: string;
  tone: string;
  items: LicenseItem[];
  params: ViewParams;
  undated?: boolean;
}) {
  return (
    <div className={`card bucket ${tone}`}>
      <h2>
        {title}
        <span className="c">{items.length}</span>
      </h2>
      {items.length ? (
        <ul className="list">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                className="go"
                href={hrefWith("/renovacoes", params, { doc: i.id })}
                scroll={false}
              >
                <div className="t">{TYPE_SHORT[i.type]}</div>
                <div className="s">
                  {displayName(i)}
                  {undated ? "" : ` · ${formatDate(i.validUntil)}`}
                </div>
              </Link>
              {undated ? (
                <Badge item={i} />
              ) : (
                <span className={`badge ${BADGE_CLASS[i.status]}`}>
                  {(i.days as number) < 0 ? `${Math.abs(i.days as number)} d atrás` : `${i.days} d`}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">—</div>
      )}
    </div>
  );
}

export default async function RenovacoesPage({ searchParams }: PageProps<"/renovacoes">) {
  const ctx = await loadViewContext(await searchParams);
  const buckets = renewalBuckets(ctx.scoped);
  const undated = ctx.scoped.filter((i) => i.days === null && i.status === "pending");

  return (
    <>
      <h1 className="title">Renovações</h1>
      <p className="sub">Vencimentos organizados por prazo, do mais urgente ao mais distante</p>
      <div className="buckets">
        {buckets.map((b) => (
          <BucketCard
            key={b.title}
            title={b.title}
            tone={b.tone}
            items={b.items}
            params={ctx.params}
          />
        ))}
        <BucketCard
          title="Sem data de validade"
          tone="mute"
          items={undated}
          params={ctx.params}
          undated
        />
      </div>
      {ctx.openDoc && <DetailDrawer item={ctx.openDoc} />}
    </>
  );
}
