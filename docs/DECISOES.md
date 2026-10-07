# Decisões

- 2026-10-07 — O repositório `Norma37523/alvara` (e não `norma-alvaras`, como cita o escopo) é a base do projeto.
- 2026-10-07 — A view `licenses_with_status` usa `security_invoker` para respeitar RLS na Fase 2 e cai nos cortes 30/60 se `app_settings` estiver vazia (o seed é a tarefa F1-04).
- 2026-10-07 — RLS ligado em todas as tabelas já na migração inicial, sem políticas: só o servidor (service role) acessa até a F2-01.
- 2026-10-07 — `/saude` consulta `app_settings` com service role e não expõe a mensagem de erro do banco.
- 2026-10-07 — A migração 0001 foi aplicada manualmente pelo SQL Editor do Supabase (exceção à regra de só usar migração versionada). As próximas passam pela Supabase CLI ou pela integração com o GitHub.
- 2026-10-07 — O repositório é público. `reference/*.xlsx` e `reports/` estão no `.gitignore` por conterem CNPJs e dados de clientes. Recomendado tornar o repositório privado.
- 2026-10-07 — Importação: licença já existente (empresa + unidade + tipo) não é sobrescrita, para preservar edições manuais. Rótulos de unidade: `matriz`, `filial Foz`, `matriz única`.
- 2026-10-07 — O link da coluna L é só "Abrir no Drive" (texto, sem URL); não foi guardado. Os arquivos virão do Drive na F1-13.
- 2026-10-07 — Inconsistências para correção pelo dono: Bombeiros com órgão "Prefeitura Municipal" em NP Partners, Gelic e Vanlink (o escopo citava só as duas primeiras).
- 2026-10-07 — Telas leem o banco com a service role, depois de `requireStaff()` (login, MFA concluído e perfil ativo da equipe). RLS por empresa e papéis de cliente ficam para a F2-01. O `proxy.ts` é só checagem otimista; a autorização é do servidor.
- 2026-10-07 — O Supabase Auth não é criado por script: a conta é criada pelo dono no painel e `pnpm make:staff` só atribui o perfil.
- 2026-10-07 — Logos vieram dos arquivos `Ass-HORIZ_*` da identidade visual e estão em `public/brand/`. O manual de identidade (`Norma Contabil_IDV.pdf`) não foi versionado.
