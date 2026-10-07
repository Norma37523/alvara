import { Suspense } from "react";
import { NavLinks } from "@/components/shell/nav-links";
import { TopBar } from "@/components/shell/top-bar";
import { requireStaff } from "@/server/auth";
import { fetchLicenseItems } from "@/server/licenses";
import type { CompanyOption } from "@/server/view-context";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const staff = await requireStaff();
  const items = await fetchLicenseItems();

  const byCompany = new Map<string, CompanyOption>();
  for (const i of items) {
    const entry = byCompany.get(i.companyId) ?? { id: i.companyId, name: i.companyName, units: [] };
    if (!entry.units.includes(i.unitLabel)) entry.units.push(i.unitLabel);
    byCompany.set(i.companyId, entry);
  }
  const companies = [...byCompany.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const alertCount = items.filter((i) => i.status === "expired" || i.status === "due_30").length;
  const isAdmin = staff.role === "norma_admin";

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/horizontal-negative.png" alt="Norma Contábil" />
          <small>Gestão de alvarás e licenças</small>
        </div>
        <Suspense fallback={null}>
          <NavLinks alertCount={alertCount} isAdmin={isAdmin} />
        </Suspense>
        <div className="foot">
          <form action="/logout" method="post">
            <button className="sidebtn" type="submit">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="main">
        <Suspense fallback={null}>
          <TopBar
            companies={companies}
            userName={staff.fullName ?? staff.email}
            roleLabel={isAdmin ? "Perfil: administrador Norma" : "Perfil: equipe Norma"}
          />
        </Suspense>
        {children}
      </main>
    </div>
  );
}
