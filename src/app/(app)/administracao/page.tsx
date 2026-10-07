import { redirect } from "next/navigation";
import { requireStaff } from "@/server/auth";
import { loadViewContext } from "@/server/view-context";

export const metadata = { title: "Administração – Norma Alvarás" };

export default async function AdministracaoPage({ searchParams }: PageProps<"/administracao">) {
  const staff = await requireStaff();
  if (staff.role !== "norma_admin") redirect("/");
  const ctx = await loadViewContext(await searchParams);

  return (
    <>
      <h1 className="title">Administração</h1>
      <p className="sub">
        Empresas cadastradas. Usuários, pastas do Drive e avisos entram nas próximas tarefas.
      </p>
      <div className="tbl">
        <table style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Unidades</th>
              <th>Licenças</th>
            </tr>
          </thead>
          <tbody>
            {ctx.companies.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.units.join(", ")}</td>
                <td>{ctx.all.filter((i) => i.companyId === c.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
